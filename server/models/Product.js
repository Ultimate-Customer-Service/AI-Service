const database = require("../config/mongodb");

class Product {
	static async findProductByCategory(category) {
		try {
			// console.log(category, "<<<<<< MASUK MODEL PRODUCT");

			const product = await database
				.collection("products")
				.findOne({ category });

			return product;
		} catch (error) {
			// console.log(error, "<<<<<<< FIND PRODUCT");
			console.log(error)
		}
	}
}

module.exports = Product;
