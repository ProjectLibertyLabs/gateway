import axios from 'axios';

// Use random strings and emoji each run so that the content is new each time
const randomString = Array(10)
  .fill(null)
  .map(() => Math.round(Math.random() * 16).toString(16))
  .join('');
const randomEmoji = String.fromCodePoint(Math.floor(Math.random() * (0x1f57f - 0x1f519 + 1)) + 0x1f519);

const validLocation = {
  name: 'name of location',
  accuracy: 97,
  altitude: 10,
  latitude: 37.26,
  longitude: -119.59,
  radius: 10,
  units: 'm',
};
const validTags = [
  {
    type: 'mention',
    mentionedId: 'dsnp://78187493520',
  },
  {
    type: 'hashtag',
    name: '#taggedUser',
  },
];
const validContentNoUploadedAssets = {
  content: `test broadcast message with Random: ${randomString}`,
  published: '1970-01-01T00:00:00+00:00',
  name: 'name of note content',
  assets: [
    {
      type: 'link',
      name: 'link asset',
      href: 'http://example.com',
    },
  ],
  tag: validTags,
  location: validLocation,
};
const validBroadCastNoUploadedAssets = {
  content: validContentNoUploadedAssets,
};
const validReplyNoUploadedAssets = {
  content: validContentNoUploadedAssets,
  inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};
const validReaction = {
  emoji: randomEmoji,
  apply: 5,
  inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

const apiUrl = 'http://localhost:3001/api';

const postBroadcast = async (dsnpUserId, content) => {
  try {
    const url = `${apiUrl}/content/${dsnpUserId}/broadcast`;
    console.log(`[Setup] Making POST request to: ${url}`);
    console.log(`[Setup] Request payload:`, content);
    try {
      const response = await axios.post(url, content);
      console.log(`[Setup] POST request successful`);
      console.log(`[Setup] Response status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`[Setup] POST request failed to: ${url}`);
      if (axios.isAxiosError(error)) {
        console.error('[Setup] Axios Error Details:');
        console.error(`- Message: ${error.message}`);
        console.error(`- Code: ${error.code}`);
        console.error(`- Status: ${error.response?.status}`);
        console.error(`- Status Text: ${error.response?.statusText}`);
        console.error('- Request Config:', {
          method: error.config?.method,
          url: error.config?.url,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        });
        if (error.response?.data) {
          console.error('- Response Data:', error.response.data);
        }
      } else {
        console.error('[Setup] Non-Axios Error:', error);
      }
      throw error;
    }
    return response.data;
  } catch (error) {
    console.error('Error posting broadcast:', error.message);
    throw error;
  }
};

const postReply = async (dsnpUserId, content) => {
  try {
    const url = `${apiUrl}/content/${dsnpUserId}/reply`;
    console.log(`[Setup] Making POST request to: ${url}`);
    console.log(`[Setup] Request payload:`, content);
    try {
      const response = await axios.post(url, content);
      console.log(`[Setup] POST request successful`);
      console.log(`[Setup] Response status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`[Setup] POST request failed to: ${url}`);
      if (axios.isAxiosError(error)) {
        console.error('[Setup] Axios Error Details:');
        console.error(`- Message: ${error.message}`);
        console.error(`- Code: ${error.code}`);
        console.error(`- Status: ${error.response?.status}`);
        console.error(`- Status Text: ${error.response?.statusText}`);
        console.error('- Request Config:', {
          method: error.config?.method,
          url: error.config?.url,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        });
        if (error.response?.data) {
          console.error('- Response Data:', error.response.data);
        }
      } else {
        console.error('[Setup] Non-Axios Error:', error);
      }
      throw error;
    }
    return response.data;
  } catch (error) {
    console.error('Error posting reply:', error.message);
    throw error;
  }
};

const postReaction = async (dsnpUserId, reaction) => {
  try {
    const url = `${apiUrl}/content/${dsnpUserId}/reaction`;
    console.log(`[Setup] Making POST request to: ${url}`);
    console.log(`[Setup] Request payload:`, reaction);
    try {
      const response = await axios.post(url, reaction);
      console.log(`[Setup] POST request successful`);
      console.log(`[Setup] Response status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`[Setup] POST request failed to: ${url}`);
      if (axios.isAxiosError(error)) {
        console.error('[Setup] Axios Error Details:');
        console.error(`- Message: ${error.message}`);
        console.error(`- Code: ${error.code}`);
        console.error(`- Status: ${error.response?.status}`);
        console.error(`- Status Text: ${error.response?.statusText}`);
        console.error('- Request Config:', {
          method: error.config?.method,
          url: error.config?.url,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        });
        if (error.response?.data) {
          console.error('- Response Data:', error.response.data);
        }
      } else {
        console.error('[Setup] Non-Axios Error:', error);
      }
      throw error;
    }
    return response.data;
  } catch (error) {
    console.error('Error posting reaction:', error.message);
    throw error;
  }
};

const main = async () => {
  const dsnpUserId = '1'; // Replace with the desired user ID

  // Example: Post broadcast
  const broadcastResponse = await postBroadcast(dsnpUserId, validBroadCastNoUploadedAssets);
  console.log('Broadcast Response:', broadcastResponse);

  // Example: Post reply
  const replyResponse = await postReply(dsnpUserId, validReplyNoUploadedAssets);
  console.log('Reply Response:', replyResponse);

  // Example: Post reaction
  const reactionResponse = await postReaction(dsnpUserId, validReaction);
  console.log('Reaction Response:', reactionResponse);
};

// Run the main function
main();
