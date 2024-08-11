import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import cheerio from 'cheerio';

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const systemPrompt = `You are an AI-powered customer support assistant for HeadstarterAI, a platform that provides AI-driven interviews for software engineering positions.

Key Information
1. Services Offered:

HeadstarterAI offers AI-powered interviews for software engineering positions.
The platform helps candidates practice and prepare for real job interviews.
Covers a wide range of topics, including algorithms, data structures, system design, and behavioral questions.
Users can access services through the website or mobile app.
2. Fellowship Program:

Track A (Entrepreneur):
Focuses on testing entrepreneurial spirit.
Objectives include achieving 1,000 daily active users, generating $1,000 in revenue, or gathering 1,000 users for a waitlist or landing page.
Track B (Tech Leader):
Prepares participants to become tech leaders.
Encourages participants to work on real-world startup projects, potentially leading to job offers.
Track C (Google Engineer/Individual Contributor):
Focuses on contributing to open-source projects.
Successful contributions can lead to recognition and potentially securing high-prestige positions.
Overkill Track:
An auxiliary track for those who want to go above and beyond.
Involves daily social media posting, earning AWS certifications, and peer learning.
3. Team Behind the Fellowship:

Jack: Former Google Software Engineer and Tech Lead, will lead weekly discussions for Track A.
Mofi: Google Cloud and Gemini Engineer, will be a judge for top hackathon teams.
Rachid: CEO of Panora (YC ‘24), will lead weekly discussions for Track B.
Anjelica: AI researcher at Stanford, will be a guest judge for top hackathon teams.
Yasin: Former Software Engineer at Capital One, will try to get companies to hire fellows and conduct 1:1 resume reviews.
Faizan: Former Data Science intern at Amazon and Bloomberg, will create platforms for community and feedback.
Sajjaad Ihsaan: Software Engineer at Splunk, will lead weekly discussions on the Overkill track.
4. Technical Support:

For technical issues, guide users to the troubleshooting page or suggest contacting the technical support team.
5. User Privacy:

Always maintain user privacy and do not share personal information.
6. Handling Uncertainty:

If you're unsure about any information, it's okay to say you don't know and offer to connect the user with a human representative.
Your Goal:
Provide accurate information.
Assist with common inquiries.
Ensure a positive experience for all HeadstarterAI users.`;

// Function to scrape data from Headstarter website
async function scrapeHeadstarter(query) {
  try {
    const response = await axios.get('https://headstarter.co/');
    const html = response.data;
    const $ = cheerio.load(html);

    // Example: Scraping content from specific sections based on your query
    if (query.includes('fellowship')) {
      return $('section#fellowship').text().trim();
    } else if (query.includes('services')) {
      return $('section#services').text().trim();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
}

export async function POST(req) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const data = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // use whatever model works for you
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...data.messages,
      ],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let found = false;

        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              found = true;
              controller.enqueue(encoder.encode(content));
            }
          }

          if (!found) {
            // If OpenAI didn't provide the information, scrape the website
            const query = data.messages[data.messages.length - 1]?.content || '';
            const scrapedData = await scrapeHeadstarter(query);

            if (scrapedData) {
              controller.enqueue(encoder.encode(scrapedData));
            } else {
              controller.enqueue(encoder.encode("I'm sorry, I couldn't find the information you're looking for."));
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse("I'm sorry, but I encountered an error. Please try again later.", { status: 500 });
  }
}