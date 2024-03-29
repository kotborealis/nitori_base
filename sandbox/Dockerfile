FROM bitnami/minideb:latest

RUN apt-get update && apt-get install -y --no-install-recommends locales g++ valgrind gdb vim build-essential \
 && rm -rf /var/lib/apt/lists/* \
 && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8

RUN mkdir -p /opt/nitori/__unit_test/
COPY ./shared/* /opt/nitori/
COPY ./shared/__unit_test/* /opt/nitori/__unit_test/

RUN g++ \
    -std=c++2a \
    -fconcepts \
    -c \
    /opt/nitori/testing.hpp \
    -o /opt/nitori/testing.hpp.gch

RUN groupadd sandboxers

RUN useradd -M -d /opt/nitori/ testrunner
RUN gpasswd -a testrunner sandboxers

RUN mkdir -p /sandbox
RUN useradd -M -d /sandbox sandbox
RUN gpasswd -a sandbox sandboxers

RUN chown -R testrunner:testrunner /opt/nitori/
RUN chmod -R 700 /opt/nitori/

RUN chown -R sandbox:sandboxers /sandbox
RUN chmod -R 770 /sandbox

WORKDIR /sandbox

USER sandbox
