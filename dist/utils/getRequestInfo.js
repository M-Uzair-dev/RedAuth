import { UAParser } from "ua-parser-js";
export const getLoginMeta = async (req) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "Unknown";
    const ua = req.headers["user-agent"] || "";
    const parser = new UAParser(ua);
    const browserData = parser.getBrowser();
    const osData = parser.getOS();
    const deviceData = parser.getDevice();
    const browser = `${browserData.name || "Unknown"} ${browserData.version || ""}`.trim();
    const device = deviceData.model
        ? `${deviceData.model}`
        : `${osData.name || "Unknown OS"} (${deviceData.type || "desktop"})`;
    let location = "Unknown";
    try {
        // Create abort controller with 5 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        const res = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId); // Clear timeout if request completes
        const data = await res.json();
        if (data?.city && data?.country_name) {
            location = `${data.city}, ${data.country_name}`;
        }
    }
    catch (error) {
        // Timeout or network error - fail silently
        if (error.name === "AbortError") {
            console.error("IP geolocation request timed out");
        }
    }
    const time = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
    console.log({
        ip,
        location,
        browser,
        device,
        time,
    });
    return {
        ip,
        location,
        browser,
        device,
        time,
    };
};
export const getDevice = (req) => {
    const ua = req.headers["user-agent"] || "";
    const parser = new UAParser(ua);
    const osData = parser.getOS();
    const deviceData = parser.getDevice();
    const device = deviceData.model
        ? `${deviceData.model}`
        : `${osData.name || "Unknown OS"} (${deviceData.type || "desktop"})`;
    console.log("Device Name: ");
    return device;
};
//# sourceMappingURL=getRequestInfo.js.map