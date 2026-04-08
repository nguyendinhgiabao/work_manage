const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    require('./src/models/User');
    const Notebook = require('./src/models/Notebook');
    try {
        const folder = "";
        const notebook = await (await Notebook.create({
            title: 'Test empty folder',
            user: '6448ab3e3b082c16198f7b7f', 
            folder: folder || null,
        })).populate('user', 'name email');
        console.log('Success:', notebook._id);
    } catch(err) {
        console.error('Error:', err.message);
    }
    process.exit();
}).catch(console.error);
