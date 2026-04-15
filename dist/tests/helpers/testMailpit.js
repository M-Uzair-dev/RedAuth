const getApiUrl = () => {
    const url = process.env.MAILPIT_API_URL;
    if (!url)
        throw new Error("MAILPIT_API_URL is not set");
    return url;
};
export const waitForEmail = async (to, subject, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const res = await fetch(`${getApiUrl()}/api/v1/messages`);
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
    const res = await fetch(`${getApiUrl()}/api/v1/message/${id}`);
    const data = await res.json();
    return data.HTML;
};
export const clearEmails = async () => {
    await fetch(`${getApiUrl()}/api/v1/messages`, { method: "DELETE" });
};
//# sourceMappingURL=testMailpit.js.map