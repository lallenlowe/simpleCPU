"use strict";

const path = require("path");

const basePath = path.resolve(__dirname, "./eslintrc.yml");

module.exports = {
  extends: [basePath, "prettier"],
  plugins: ["fp"],
  rules: {
    "fp/no-loops": "error",
    "no-undefined": 0, // proposal in-progress  (https://walmart.slack.com/archives/G06PNK2LF/p1561745601266700)
    "import/no-extraneous-dependencies": 0,
    // Linting is run as the first test check and can happen before build configs
    // are generated
    "import/no-unresolved": [2, { commonjs: true, ignore: ["build/*"] }]
  }
};
