const mongoose = require("mongoose");

//connecting the database

mongoose.connect("mongodb+srv://user:FzbwDA4PAPkFetrr@cluster0.y8vqr.mongodb.net/expregister?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`database connected`);
}).catch((e) => {
    console.log(e);
})