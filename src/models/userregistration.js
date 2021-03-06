const mongoose = require("mongoose");

//creating Schema to store entered information

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    hashedpwd: {
        type: String,
        required: true
    },
    balance: {
        type: Number
    }
});


const Register = new mongoose.model("Register", userSchema);

module.exports = Register;
