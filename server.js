const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new Anthropic();

app.post('/api/parse-job', async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Extract the following information from this job posting. Return ONLY valid JSON, no markdown, no extra text. If a field is not found, use null.

Job posting:
${jobDescription}

Return this exact JSON structure (no markdown, just raw JSON):
{
  "company": "company name",
  "role": "job title",
  "salary": "salary range if mentioned, or null"
}`,
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Try to extract JSON from the response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ error: 'Failed to parse response' });
      }
    }

    res.json({
      success: true,
      data: {
        company: parsed.company || '',
        role: parsed.role || '',
        salary: parsed.salary || '',
      },
    });
  } catch (error) {
    console.error('Error parsing job description:', error);
    res.status(500).json({
      error: 'Failed to parse job description',
      message: error.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Job tracker backend running on port ${port}`);
});
