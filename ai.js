require("dotenv").config();

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

async function askAI(userMessage) {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error("Missing NVIDIA_API_KEY in .env");
  }

  const payload = {
    model: "meta/llama3-70b-instruct", // ✅ safer model
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 1024,
    temperature: 0.6,
    top_p: 0.95,
    stream: true,
  };

  try {
    const res = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("FULL ERROR:", errText);
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let finalText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (let line of lines) {
        line = line.trim();

        if (!line.startsWith("data:")) continue;

        const jsonStr = line.replace("data:", "").trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;

          if (content) finalText += content;

        } catch {}
      }
    }

    return finalText || "No response";

  } catch (err) {
    console.error("AI Error:", err);
    return "AI failed";
  }
}

module.exports = { askAI };