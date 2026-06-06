import jwt from "jsonwebtoken"

export const generateToken=(userId, res)=> {
    const token = jwt.sign({userId}, process.env.JWT_SECRET,{
        expiresIn:"7d"
    })
    res.cookie("jwt",token, {
        maxAge: 7*24*60*60*1000,//milisecond
        httpOnly: true,  //prevent XSS attacks cross-site scripting atttacks
        sameSite:"strict", //CSRF attacks croos- site request forgery attacks
        secure: process.env.NODE_ENV !== "development",
    });

    return token;
}