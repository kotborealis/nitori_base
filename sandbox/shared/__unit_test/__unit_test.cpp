int sum(int, int);
void print(int);
int call_fpe();

TEST_CASE("self-test") {
    SECTION("Hijack&restore stdout") {
        ::nitori::hijack_stdout();
        printf("stdout");
        ::nitori::restore_stdout();
        REQUIRE(::nitori::stdout() == "stdout");
    }

    SECTION("Hijack&restore stderr") {
        ::nitori::hijack_stderr();
        fprintf(stderr, "stderr");
        ::nitori::restore_stderr();
        REQUIRE(::nitori::stderr() == "stderr");
    }

    SECTION("Hijack&restore stdin") {
        nitori::stdin("17");
        int c = -1;
        std::cin >> c;
        REQUIRE(c == 17);
        nitori::restore_stdin();
    }

    SECTION("Trim stdout") {
        ::nitori::hijack_stdout();
        printf("\t\n    abc def   \t\n \t");
        ::nitori::restore_stdout();
        REQUIRE(::nitori::stdout() == "abc def");
    }

    SECTION("Don't trim stdout") {
        ::nitori::hijack_stdout();
        printf("\t\n    abc def   \t\n \t");
        ::nitori::restore_stdout();
        REQUIRE(::nitori::stdout(false) == "\t\n    abc def   \t\n \t");
    }

    SECTION("Call original main") {
        std::vector<char*> a{};
        std::vector<char*> b{"abc", "abe"};
        nitori::stdin("123");
        REQUIRE(::nitori::main() == 7);
        nitori::stdin("123");
        REQUIRE(::nitori::main(a) == 7);
        nitori::stdin("123");
        REQUIRE(::nitori::main(b) == 7);
    }

    SECTION("Call & test original main with test suite") {
        nitori::main({
            .exitCode = 7,
            .stdin = "34",
            .stdout = "34"
        });

        nitori::main({
            .exitCode = 7,
            .stdin = "45",
            .stdout = "45"
        });

        nitori::main({
            .exitCode = 7,
            .stdin = "888",
            .stdout = "888"
        });

        nitori::main({
            .exitCode = 7,
            .stdin = "888",
            .stdout = "888"
        });
    }

    SECTION("with_stdout") {
        {
            const auto [output, retval] = nitori::call(sum, 2, 3);
            REQUIRE(output == "2+3=5");
            REQUIRE(retval == 5);
        }
        {
            const auto [output] = nitori::call(print, 777);
            REQUIRE(output == "777");
        }
    }

    SECTION("Handles FPE") {
        call_fpe();
    }
}