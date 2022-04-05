const mongoose = require("mongoose");

//creating Schema to store entered information

const recSchema = new mongoose.Schema({
    hashedpwd: {
        type: String,
        required: true,
        unique: false
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    id: {
        type: String
    }
})

const recRegister = new mongoose.model("recRegister", recSchema);

module.exports = recRegister;