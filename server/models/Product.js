const database = require("../config/mongodb");

class Product {
	static async findProductByCategory(category) {
		try {
			const product = await database
				.collection("products")
				.findOne({ category });

			return product;
		} catch (error) {
			console.log(error);
		}
	}
}

module.exports = Product;
