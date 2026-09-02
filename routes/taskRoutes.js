const express = require("express");

const {
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require("../controllers/taskController");

const router = express.Router();

router.post("/",createTask);

router.get("/",getTasks);

router.put("/:id",updateTask);

router.delete("/:id", deleteTask);

module.exports = router;



