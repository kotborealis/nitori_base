#pragma once

#include <string>
#include <vector>
#include <map>
#include <optional>

#include "util.hpp"

namespace nitori::processTest {

struct ProcessTestCase {
    std::vector<char*> args = {}; //!< CLI args
    std::optional<int> exitCode = {}; //!< Expected exit code

    std::map<std::string, std::string> fsin = {}; //!< Input filesystem (filename => content)
    std::map<std::string, std::string> fsout = {}; //!< Expected output filesystem (filename => content)

    std::string stdin = ""; //!< Standard input
    std::optional<std::string> stdout = {}; //!< Expected standard output
};

using ProcessTestSuite = std::vector<ProcessTestCase>;

}