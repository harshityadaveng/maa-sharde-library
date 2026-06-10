const ContactMessage = require('../models/ContactMessage');

const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      res.status(400);
      throw new Error('Name, email and message are required.');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400);
      throw new Error('Invalid email format.');
    }

    // Phone format validation (optional, but must be valid if provided)
    if (phone && phone.trim() !== '') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        res.status(400);
        throw new Error('Mobile number must be exactly 10 digits.');
      }
    }

    const contact = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      message: message.trim(),
    });

    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
};

const getContactMessages = async (req, res, next) => {
  try {
    const contacts = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

const deleteContactMessage = async (req, res, next) => {
  try {
    const contact = await ContactMessage.findById(req.params.id);
    if (!contact) {
      res.status(404);
      throw new Error('Contact message not found');
    }
    await ContactMessage.findByIdAndDelete(contact._id);
    res.json({ message: 'Contact message deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
  deleteContactMessage,
};
