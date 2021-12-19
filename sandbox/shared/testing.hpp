#pragma once

#define CATCH_CONFIG_RUNNER
#include "catch.hpp"
#include "backtrace.hpp"

#include <iostream>
#include <fstream>
#include <cctype>
#include <locale>
#include <cstdio>
#include <tuple>
#include <csetjmp>

int main(int argc, char** argv) {
    __exec_name = argv[0];

    struct sigaction sa;

    sa.sa_sigaction = bt_sighandler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART|SA_SIGINFO;

    sigaction(SIGSEGV, &sa, NULL);
    sigaction(SIGFPE,  &sa, NULL);
    sigaction(SIGILL,  &sa, NULL);
    sigaction(SIGBUS,  &sa, NULL);
    sigaction(SIGABRT, &sa, NULL);
    sigaction(SIGTRAP, &sa, NULL);
    return Catch::Session().run(argc, argv);
}

extern "C" {
    int __NITORI_HIJACK_MAIN__(int argc, char** argv) __attribute__((weak));

    int __NITORI_HIJACK_MAIN__(int argc, char** argv) {
        printf("Function `int main(int, char**)` was not found in target,\n");
        printf("using *this* stub for linking.\n\n");

        printf("exitCode=0xBADF00D\n");
        return 0xBADF00D;
    }

    static jmp_buf exit_jmp;
    static int exit_jmp_code;

    int __NITORI_HIJACK_EXIT__(int exitCode) {
        exit_jmp_code = exitCode;
        longjmp(exit_jmp, 1);
    }
}

#include "util.hpp"
#include "processTest.hpp"

namespace nitori {

/**
 * Hijack stdout
 */
void hijack_stdout() {
    fflush(stdout);
    freopen(".stdout", "w", stdout);
}

/**
 * Restore stdout
 */
void restore_stdout() {
    fflush(stdout);
    freopen("/dev/tty", "w", stdout);
}

/**
 * Hijack stderr
 */
void hijack_stderr() {
    fflush(stderr);
    freopen(".stderr", "w", stderr);
}

/**
 * Restore stderr
 */
void restore_stderr() {
    fflush(stderr);
    freopen("/dev/tty", "w", stderr);
}

/**
 * Hijack stdin
 *
 * @param value stdin value
 */
void hijack_stdin(std::string value = "") {
    freopen(".stdin", "w", stdin);
    fprintf(stdin, "%s", value.c_str());
    freopen(".stdin", "r", stdin);
}

/**
 * Restore stdin
 */
void restore_stdin() {
    freopen("/dev/tty", "r", stdin);
}

/**
 * Get stdout
 * @param trim Trim return value? True by default
 */
std::string stdout(bool trim = true) {
    auto content = util::readFile(".stdout");
    return trim ? util::trim(content) : content;
}

/**
 * Get stderr
 * @param trim Trim return value? True by default
 */
std::string stderr(bool trim = true) {
    auto content = util::readFile(".stderr");
    return trim ? util::trim(content) : content;
}

/**
 * Get stdin
 * @param trim Trim return value? True by default
 */
std::string stdin(bool trim = true) {
    auto content = util::readFile(".stdin");
    return trim ? util::trim(content) : content;
}

/**
 * Hijack stdin alias
 *
 * @param value stdin value
 */
void stdin(std::string value = "") {
    hijack_stdin(value);
}

/**
 * Hijack stdin alias
 *
 * @param value stdin value
 */
void stdin(const char* value) {
    hijack_stdin(value);
}

/**
 * Call hijacked main with classic argc & argv
 * Automaticly hijacks and restores stdout and stderr
 *
 * @param argc
 * @param argv
 */
int main(int argc, char** argv) {
    UNSCOPED_INFO("Running main() w/ argc=" << argc << " and argv:");
    for(int i = 0; i < argc; i++)
        UNSCOPED_INFO("\t argv[" << i << "]=`" << argv[i] << "`");

    nitori::hijack_stdout();

    // init exit code
    int exitCode = 0xDEADBEEF;

    // if hijacked main calls exit/abort/etc, it kills whole process by default
    // overwritten exit/abort/etc will perform longjump to exit main
    if(!setjmp(exit_jmp)) {
        exitCode = __NITORI_HIJACK_MAIN__(argc, argv);
    }
    else{
        exitCode = exit_jmp_code;
    }

    nitori::restore_stdout();
    nitori::restore_stdin();

    return exitCode;
}

/**
 * Call hijacked main with vector args and default program name
 * Automaticly hijacks and restores stdout and stderr
 *
 * @param args Vector with arguments, except argv[0] (program name)
 */
int main(std::vector<char*> args) {
    args.insert(args.begin(), const_cast<char*>("hijacked_main_call"));

    int argc = args.size();
    char **argv = &args[0];

    return ::nitori::main(argc, argv);
}

/**
 * Call hijacked main without args
 * Automaticly hijacks and restores stdout and stderr
 */
int main() {
    return ::nitori::main({});
}

int main(::nitori::processTest::ProcessTestCase test) {

    for(auto const& [filename, content] : test.fsin)
        ::nitori::util::writeFile(filename, content);

    ::nitori::stdin(test.stdin);

    auto exitCode = ::nitori::main(test.args);

    if(test.exitCode.has_value()) {
        auto expectedExitCode = *test.exitCode;
        REQUIRE(exitCode == expectedExitCode);
    }

    if(test.stdout.has_value()) {
        auto stdout = nitori::stdout();
        auto expectedStdout = util::trim(*test.stdout);

        REQUIRE(stdout == expectedStdout);
    }

    for(auto const& [filename, expectedContent] : test.fsout) {
        auto content = util::trim(
            util::readFile(filename)
        );

        REQUIRE(content == expectedContent);
    }

    return exitCode;
}

void main(::nitori::processTest::ProcessTestSuite suite) {
    auto test = GENERATE_REF(from_range(suite.begin(), suite.end()));
    ::nitori::main(test);
}

/**
 * Call function fn with arguments args and return its stdout and return value
 * Returns tuple:
 * * If fn returns void: std::tuple<std::string stdout>,
 *      where stdout are trimmed
 * * Else if fn returns type T: std::tuple<std::string stdout, T retval>,
 *      where stdout is trimmed, and retval is return value of function fn
 */
template<typename... Args>
auto call(auto fn, Args... args) {
    if constexpr (std::is_same_v<decltype(fn(args...)), void>) {
        ::nitori::hijack_stdout();
        fn(std::forward<Args>(args)...);
        ::nitori::restore_stdout();
        return std::make_tuple(::nitori::stdout());
    }
    else {
        ::nitori::hijack_stdout();
        auto retval = fn(std::forward<Args>(args)...);
        ::nitori::restore_stdout();
        return std::make_tuple(::nitori::stdout(), retval);
    }
}

}
