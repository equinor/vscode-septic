module.exports = {
	transform: { "^.+\\.ts?$": "ts-jest" },
	testEnvironment: "node",
	testRegex: ["/server/unittest/.*\\.(test|spec)?\\.(ts|tsx)$"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
