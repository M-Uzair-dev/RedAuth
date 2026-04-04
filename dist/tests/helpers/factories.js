import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
export const generateUserData = (overWrite) => {
    const name = faker.person.fullName();
    const email = faker.internet.email();
    const password = "StrongPassword123!";
    const device = uuidv4();
    return {
        name,
        email,
        password,
        device,
        ...overWrite,
    };
};
export const generateLoginData = (data) => {
    const { email, password, device } = data;
    return { email, password, device };
};
//# sourceMappingURL=factories.js.map