const { getContactsCollection } = require('../config/db');

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const createContact = async (req, res, next) => {
  try {
    const contact = req.body;
    
    if (!contact.name || typeof contact.name !== 'string' || contact.name.trim().length < 2) {
      return res.status(400).send({ error: true, message: "Name must be at least 2 characters." });
    }
    if (!contact.email || !validateEmail(contact.email)) {
      return res.status(400).send({ error: true, message: "A valid email address is required." });
    }
    if (!contact.subject || typeof contact.subject !== 'string' || contact.subject.trim().length < 4) {
      return res.status(400).send({ error: true, message: "Subject must be at least 4 characters." });
    }
    if (!contact.message || typeof contact.message !== 'string' || contact.message.trim().length < 10) {
      return res.status(400).send({ error: true, message: "Message must be at least 10 characters." });
    }

    const contactsCollection = getContactsCollection();
    const newContact = {
      name: contact.name.trim(),
      email: contact.email.trim().toLowerCase(),
      subject: contact.subject.trim(),
      message: contact.message.trim(),
      createdAt: new Date()
    };

    const result = await contactsCollection.insertOne(newContact);
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createContact
};
