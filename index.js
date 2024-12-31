const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')


const port = process.env.PORT || 5000
const app = express()

const corsOptions = {
    origin: ['http://localhost:5173', 'https://book-your-hotel-18c2b.web.app', 'https://book-your-hotel-18c2b.firebaseapp.com'],
    credentials: true,
    optionalSuccessStatus: 200,
};

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lue0n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        return res.status(401).send({ message: 'UnAuthorized' });
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'UnAuthorized' });
        }
        req.user = decoded
    })
    console.log(token)
    next()
}

async function run() {
    try {

        const database = client.db('hotelBooking');
        const roomCollection = database.collection('roomCollection');
        const reviewCollection = database.collection('reviewCollection')
        const bookingCollection = database.collection('bookingCollection');


        // generate jwt 
        app.post('/jwt', async (req, res) => {
            const email = req.body;

            const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '365d' })
            console.log(token)
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'node' : 'strict',
            }).send({ success: true })
        })


        // logout || clear cookie from browser 
        app.get('/logout', async (req, res) => {
            res.clearCookie('token', {
                maxAge: 0,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'node' : 'strict',
            }).send({ success: true })
        })


        app.get("/rooms", verifyToken, async (req, res) => {
            const { minPrice, maxPrice } = req.query;

            const filter = {};
            if (minPrice) filter.price = { $gte: parseInt(minPrice) };
            if (maxPrice) filter.price = { ...filter.price, $lte: parseInt(maxPrice) };

            try {
                const rooms = await roomCollection.find(filter).toArray();
                res.send(rooms);
            } catch (error) {
                res.status(500).send({ message: "Error fetching rooms", error });
            }
        });


        app.get('/top-rooms', async (req, res) => {
            try {

                const rooms = await roomCollection.find().toArray();

                const roomsWithAvgRatings = rooms.map(room => {
                    const reviews = room.review || [];
                    const avgRating = reviews.length > 0
                        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                        : 0;
                    return { ...room, avgRating };
                });
                const topRatedRooms = roomsWithAvgRatings
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 6);

                res.send(topRatedRooms);

            } catch (error) {
                console.error('Error retrieving rooms:', error);
                res.status(500).send({ message: 'Failed to retrieve rooms' });
            }
        });

        app.get('/room-details/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await roomCollection.findOne(query);
            res.send(result);
        })

        // review post api 

        app.get('/all-review', async (req, res) => {
            try {
                const result = await reviewCollection.find().sort({ timestamp: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch reviews', error });
            }
        });

        app.post('/add-review/:id', verifyToken, async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review);
            res.send(result)
        })


        app.patch('/update-date/:id', verifyToken, async (req, res) => {
            const bookingId = req.params.id;
            const { bookingDate } = req.body;


            const filter = { _id: new ObjectId(bookingId) };

            const update = {
                $set: { bookingDate: new Date(bookingDate) },
            };

            const result = await bookingCollection.updateOne(filter, update);
            res.send(result);
        });


        app.get('/review/:id', async (req, res) => {

            const id = req.params.id;
            const query = { roomId: id }
            // console.log({ roomId })
            console.log(query)
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        });


        app.post('/add-rooms', verifyToken, async (req, res) => {
            const roomData = req.body;
            const result = await roomCollection.insertOne(roomData);
            res.send(result)
        })

        app.patch('/add-rooms/:id', verifyToken, async (req, res) => {
            const roomId = req.params.id;
            const { status } = req.body;
            const filter = { _id: new ObjectId(roomId) }
            const update = {
                $set: { status: status }
            }

            const result = await roomCollection.updateOne(filter, update);
            res.send(result)
            console.log({ roomId, filter, update, result })

        })


        app.get('/my-booking/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        // booking post api 
        app.post('/add-booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.send(result);
        })

        app.delete('/cancle-booking/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

    } finally {

    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Hello from Hotel Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
