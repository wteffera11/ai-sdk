import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import { vector } from 'drizzle-orm/pg-core';

const embeddingModel = openai.embedding('text-embedding-ada-002');

const generateChunks = (text: string, chunkSize = 500): string[] => {
    const sentences = text
        .replace(/\n/g, ' ')
        .split(/(?<=\.|\?|\!)/) // split by sentence end
        .map(s => s.trim())
        .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
        if ((current + ' ' + sentence).length > chunkSize) {
            if (current) chunks.push(current.trim());
            current = sentence;
        } else {
            current += ' ' + sentence;
        }
    }
    if (current) chunks.push(current.trim());

    return chunks;
};


export const generateEmbeddings = async (
    value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
    const chunks = generateChunks(value);
    if (!chunks.length) {
        throw new Error("No knowledge found → abort generation")
    }
    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks,
    });
    return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });
    return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    console.log('Finding relevant content for query:', userQuery);
    try {
        console.log('Generating embedding for query...');
        const userQueryEmbedded = await generateEmbedding(userQuery);
        console.log('Generated embedding with length:', userQueryEmbedded.length);

        const similarity = sql`1 - (cosine_distance(${embeddings.embedding}, ${JSON.stringify(userQueryEmbedded)}::vector))`;

        console.log('Querying database for similar content...');
        const similarGuides = await db
            .select({
                content: embeddings.content,
                similarity
            })
            .from(embeddings)
            .where(gt(similarity, 0.3)) // Lowered threshold
            .orderBy(desc(similarity))
            .limit(4);

        console.log('Found relevant content:', similarGuides);
        const result = similarGuides.length > 0
            ? similarGuides.map(g => g.content).join('\n\n')
            : 'No relevant information found.';

        console.log('Returning result:', result);
        return result;
    } catch (error) {
        console.error('Error finding relevant content:', error);
        return 'An error occurred while searching the knowledge base.';
    }
};