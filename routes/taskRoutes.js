const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

/**
 * ==========================================================================
 * REST API Endpoints (GET /tasks, POST /tasks, DELETE /tasks/:id)
 * ==========================================================================
 */

/**
 * @route   GET /tasks
 * @desc    Fetch all tasks from the database
 */
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks from database' });
  }
});

/**
 * @route   POST /tasks
 * @desc    Create and store a new task (expects title in request body)
 */
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask = await Task.create({
      title: title.trim(),
      description: description || '',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Pending'
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Remove a specific task by its ID
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully', task: deletedTask });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Invalid task ID or server error' });
  }
});

/**
 * ==========================================================================
 * EJS Web Dashboard Protected Routes
 * ==========================================================================
 */

router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = { user: req.user.id };

    if (status && ['Pending', 'Completed'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query).sort({ dueDate: 1 });
    const allUserTasks = await Task.find({ user: req.user.id });
    const now = new Date();

    const stats = {
      total: allUserTasks.length,
      pending: allUserTasks.filter((t) => t.status === 'Pending').length,
      completed: allUserTasks.filter((t) => t.status === 'Completed').length,
      overdue: allUserTasks.filter(
        (t) => t.status === 'Pending' && new Date(t.dueDate) < now
      ).length
    };

    res.render('dashboard', {
      tasks,
      stats,
      currentFilter: status || 'all',
      searchQuery: search || '',
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Dashboard Route Error:', error);
    res.status(500).render('dashboard', {
      tasks: [],
      stats: { total: 0, pending: 0, completed: 0, overdue: 0 },
      currentFilter: 'all',
      searchQuery: '',
      error: 'Failed to load tasks.',
      success: null
    });
  }
});

router.get('/tasks/add', requireAuth, (req, res) => {
  res.render('add-task', {
    error: null,
    title: '',
    description: '',
    dueDate: ''
  });
});

router.post('/tasks/add', requireAuth, async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    if (!title || !dueDate) {
      return res.render('add-task', {
        error: 'Please provide both task title and due date.',
        title: title || '',
        description: description || '',
        dueDate: dueDate || ''
      });
    }

    await Task.create({
      title,
      description,
      dueDate,
      status: 'Pending',
      user: req.user.id
    });

    res.redirect('/dashboard?success=Task created successfully!');
  } catch (error) {
    console.error('Create Task Error:', error);
    res.render('add-task', {
      error: error.message || 'Error creating task.',
      title: title || '',
      description: description || '',
      dueDate: dueDate || ''
    });
  }
});

router.get('/tasks/edit/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.redirect('/dashboard?error=Task not found or unauthorized');
    }

    const formattedDueDate = task.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : '';

    res.render('edit-task', { task, formattedDueDate, error: null });
  } catch (error) {
    console.error('Edit Task View Error:', error);
    res.redirect('/dashboard?error=Invalid task request');
  }
});

router.post('/tasks/edit/:id', requireAuth, async (req, res) => {
  const { title, description, dueDate, status } = req.body;

  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.redirect('/dashboard?error=Task not found or unauthorized');
    }

    task.title = title;
    task.description = description;
    task.dueDate = dueDate;
    if (['Pending', 'Completed'].includes(status)) {
      task.status = status;
    }

    await task.save();
    res.redirect('/dashboard?success=Task updated successfully!');
  } catch (error) {
    console.error('Update Task Error:', error);
    res.redirect('/dashboard?error=Failed to update task');
  }
});

router.post('/tasks/toggle/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.redirect('/dashboard?error=Task not found');
    }

    task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
    await task.save();

    res.redirect(`/dashboard?success=Task marked as ${task.status}!`);
  } catch (error) {
    console.error('Toggle Task Error:', error);
    res.redirect('/dashboard?error=Could not update task status');
  }
});

router.post('/tasks/delete/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.redirect('/dashboard?error=Task not found or unauthorized');
    }

    res.redirect('/dashboard?success=Task deleted successfully!');
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.redirect('/dashboard?error=Error deleting task');
  }
});

module.exports = router;
