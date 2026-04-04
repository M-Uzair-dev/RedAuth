import { GenericContainer } from "testcontainers";
let container;
let apiUrl;
export const createMailpit = async () => {
    container = await new GenericContainer("axllent/mailpit")
        .withExposedPorts(1025, 8025)
        .start();
    process.env.MAIL_HOST = container.getHost();
    process.env.MAIL_PORT = String(container.getMappedPort(1025));
    process.env.MAIL_USER = "";
    process.env.MAIL_PASS = "";
    apiUrl = `http://${container.getHost()}:${container.getMappedPort(8025)}`;
};
export const stopMailpit = async () => {
    await container?.stop();
};
export const waitForEmail = async (to, subject, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const res = await fetch(`${apiUrl}/api/v1/messages`);
        const data = await res.json();
        const email = data.messages?.find((m) => m.To[0].Address.toLowerCase() === to.toLowerCase() &&
            m.Subject === subject);
        if (email)
            return email;
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Email "${subject}" to ${to} not received within ${timeout}ms`);
};
export const getEmailBody = async (id) => {
    const res = await fetch(`${apiUrl}/api/v1/message/${id}`);
    const data = await res.json();
    return data.HTML;
};
export const clearEmails = async () => {
    await fetch(`${apiUrl}/api/v1/messages`, { method: "DELETE" });
};
//# sourceMappingURL=testMailpit.js.map