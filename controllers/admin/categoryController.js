const Category = require("../../models/categorySchema");



const categoryInfo = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4;
      const skip = (page - 1) * limit;
      const search = req.query.search ? req.query.search.trim() : "";

      let query = {};
      if (search) {
        query = { 
          name: { $regex: new RegExp(search, "i") } 
        };
      }
  
      console.log("Mongo Query:", query);
  
      const categoryData = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  

      console.log("Matching documents:", await Category.countDocuments(query));
  
      const totalCategories = await Category.countDocuments(query);
      const totalPages = Math.ceil(totalCategories / limit);
  
      res.render("category", {
        cat: categoryData,
        currentPage: page,
        totalPage: totalPages,
        totalCategories: totalCategories,
        search: search,
      });
    } catch (error) {
      console.log(error);
      res.redirect("/errorpage");
    }
  };
  


const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" })
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save()
        return res.json({ message: "Category added successfully" });

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
}


const getlistCategory = async (req, res) => {
    try {

        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } })
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect('/errorpage');
    }
}

const getUnlistCategory = async (req, res) => {
    try {

        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } })
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect("/errorpage");
    }
}

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id });
        res.render("edit-category", { category: category });
    } catch (error) {
        res.redirect("/errorpage")
    }
}

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
        const existingCategory = await Category.findOne({ name: categoryName });

        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, Please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updateCategory) {
            res.redirect("/admin/category");
        } else {
            res.status(404).json({ error: "Category not found" });
        }

    } catch (error) {
        res.status(500).json({ error: "internal server error" })
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    getlistCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
}