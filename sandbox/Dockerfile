FROM bitnami/minideb:unstable

RUN apt-get update && apt-get install -y --no-install-recommends locales g++ valgrind gdb vim \
 && rm -rf /var/lib/apt/lists/* \
 && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8

RUN mkdir -p /sandbox
RUN useradd -M -d /sandbox sandbox
RUN chown -R sandbox:sandbox /sandbox
WORKDIR /sandbox

RUN mkdir -p /opt/nitori/__unit_test/
COPY ./shared/* /opt/nitori/
COPY ./shared/__unit_test/* /opt/nitori/__unit_test/

RUN g++ \
        -g3 \
        -std=c++2a \
        -c \
        -include /opt/nitori/testing.hpp \
        /opt/nitori/__unit_test/__unit_test.cpp \
        -o /opt/nitori/__unit_test/__unit_test.o \
    && g++ \
        -g3 \
        -std=c++2a \
        -c \
        /opt/nitori/__unit_test/__unit_test_main.cpp \
        -o /opt/nitori/__unit_test/__unit_test_main.o \
    && objcopy \
        /opt/nitori/__unit_test/__unit_test_main.o \
        --redefine-sym \
        main=__NITORI_HIJACK_MAIN__ \
    && g++ \
        -g3 \
        -std=c++2a \
        /opt/nitori/__unit_test/__unit_test.o /opt/nitori/__unit_test/__unit_test_main.o \
        -o /opt/nitori/__unit_test/unit_test


RUN /opt/nitori/__unit_test/unit_test

RUN g++ \
    -std=c++2a \
    -c \
    /opt/nitori/testing.hpp \
    -o /opt/nitori/testing.hpp.gch