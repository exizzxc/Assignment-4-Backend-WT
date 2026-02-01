const router = require("express").Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const controller = require("../controllers/categoriesController");

// Public
router.get("/", controller.getAll);
router.get("/:id", controller.getOne);

// Admin only
router.post("/", auth, requireAdmin, controller.create);
router.put("/:id", auth, requireAdmin, controller.update);
router.delete("/:id", auth, requireAdmin, controller.remove);

module.exports = router;