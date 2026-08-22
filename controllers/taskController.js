const Task = require("../models/Task");


// Get all tasks
const getTasks = async (req, res) => {
    try {
       // const tasks = await Task.find().Sort({createdAt: -1});
        const tasks = await Task.find().sort({ createdAt: -1 });

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get tasks ",
            error: error.message,
        });
    }
};

// create a new task
const createTask = async (req, res) => {
    try {
        const { title } = req.body;

        if(!title || title.trim() === "") {
            return res.status(400).json({
                message: "Task title is required",
            });
        }

        const task = await Task.create({
            title: title.trim(),
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({
            message: "Failed to create task",
            error: error.message,
        });  
    }
};

// update to task 

const updateTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findByIdAndUpdate(
          id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

        if(!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({
            message: "Failed to update task",
            error: error.message,
        });
    }
};

//Delete a task

const deleteTask = async (req, res ) => {
    try {
        const { id } = req.params;

        const task = await Task.findByIdAndDelete(id);

        if(!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete task",
            error: error.message,
        });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
};