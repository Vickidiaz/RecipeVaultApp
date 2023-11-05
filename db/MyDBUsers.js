import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import bcrypt, { hash } from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

function MyMongoDB() {
  const myDB = {};
  const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

  async function connect() {
    const client = new MongoClient(uri, {});
    await client.connect();
    const db = client.db("RecipeVault");
    return { client, db };
  }

  myDB.register = async function (email, password) {
    const { client, db } = await connect();
    const userCollection = db.collection("Users");
    try {
      const user = await userCollection.findOne({ email });
      if (user) {
        return { error: true, message: "User already exists!" };
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await userCollection.insertOne({
        email,
        password: hashedPassword,
        savedRecipes: [],
      });
      return {
        message: "User Registered Successfully!",
        user: newUser,
        error: false,
      };
    } catch (err) {
      return { error: true, message: "Some unknown error occured. Try Again!" };
    } finally {
      await client.close();
    }
  };

  myDB.login = async function (email, password) {
    const { client, db } = await connect();
    const userCollection = db.collection("Users");
    try {
      const user = await userCollection.findOne({ email });
      if (!user) {
        return { message: "User does not exists!" };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return { error: true, message: "Username or password is Incorrect!" };
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      return { token, userID: user._id, error: false };
    } catch (err) {
      console.log(err);
      return { error: true, message: "Some unknown error occured. Try Again!" };
    } finally {
      await client.close();
    }
  };

  myDB.addRecipe = async function (recipeId, userId) {
    const { client, db } = await connect();
    const userCollection = db.collection("Users");
    const recipeCollection = db.collection("Recipes");
    try {
      const user = await userCollection.findOne({
        _id: new ObjectId(userId),
      });
      if (!user) {
        return { error: true, message: "User does not exists!" };
      }
      const recipe = await recipeCollection.findOne({
        _id: new ObjectId(recipeId),
      });
      if (!recipe) {
        return { error: true, message: "Recipe does not exists!" };
      }
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { savedRecipes: recipeId } }
      );
      return {
        message: "Added Recipe Successfully!",
        error: false,
      };
    } catch (err) {
      console.log(err);
      return { error: true, message: "Some unknown error occured. Try Again!" };
    } finally {
      console.log(err);
      await client.close();
    }
  };
  return myDB;
}

const myDB = MyMongoDB();

export default myDB;