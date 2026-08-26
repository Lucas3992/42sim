import { prisma } from "../prisma.js";

export async function generateUsernameSuggestions(base: string): Promise<string[]>{

    let array: string[] = [];
    let result: string;
    let strnumber;
    let user;
    let attempts = 0;
   

    while (array.length < 3)
    {
        if (attempts > 15)
            break;
        attempts++;
        var randomnumber = Math.random() * 1000;
        randomnumber = Math.floor(randomnumber);
        strnumber = randomnumber.toString();
        result = base + strnumber;
        user =  await prisma.user.findUnique({ where: {username: result}});
        if (user == null)
            array.push(result);
        
   }

    return array;
}