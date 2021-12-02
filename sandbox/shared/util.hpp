#pragma once

#include <fstream>
#include <algorithm>
#include <vector>
#include <functional>

namespace nitori::util {

/**
 * Trim string from start
 *
 * @param s String
 */
std::string ltrim(std::string s) {
    s.erase(s.begin(), std::find_if(s.begin(), s.end(),
            std::not1(std::ptr_fun<int, int>(std::isspace))));
    return s;
}

/**
 * Trim string from end
 *
 * @param s String
 */
std::string rtrim(std::string s) {
    s.erase(std::find_if(s.rbegin(), s.rend(),
            std::not1(std::ptr_fun<int, int>(std::isspace))).base(), s.end());
    return s;
}

/**
 * Trim string from both ends
 *
 * @param s String
 */
std::string trim(std::string s) {
    return ltrim(rtrim(s));
}

/**
 * Read file into string
 * @param filename Path to file
 */
std::string readFile(std::string filename) {
    std::ifstream file(filename);
    std::string content((std::istreambuf_iterator<char>(file)),
             std::istreambuf_iterator<char>());
    file.close();
    return content;
}

/**
 * Write string into file
 *
 * @param filename Path to file
 * @param content Data to write
 */
void writeFile(std::string filename, std::string content) {
    std::ofstream file(filename);
    file << content;
    file.close();
}

}

/**
 * Function to use with R"()" raw string literals.
 * Removes first `\n`, idents text using first line's identation.
 * See https://stackoverflow.com/questions/24879417/avoiding-the-first-newline-in-a-c11-raw-string-literal
 *
 * @param p String
 * @param size_t String length
 */
std::string operator "" _test(const char* p, size_t) {
    std::string result;

    if (p[0] == '\n') ++p;

    const char* p_leading = p;

    while (std::isspace(*p) && *p != '\n')
        ++p;

    size_t leading_len = p - p_leading;

    while (*p) {
        result += *p;
        if (*p == '\n') {
            ++p;
            for (size_t i = 0; i < leading_len; ++i)
                if (p[i] != p_leading[i])
                    goto dont_skip_leading;
            p += leading_len;
        }
        else
            ++p;
      dont_skip_leading: ;
    }

    return ::nitori::util::rtrim(result);
}