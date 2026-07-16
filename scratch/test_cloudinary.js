const { v2: cloudinary } = require('cloudinary');

async function test() {
  try {
    const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
      console.log('Callback:', error, result);
    });
    uploadStream.end(Buffer.from('test'));
    console.log('Stream ended');
  } catch (err) {
    console.log('Caught error:', err);
  }
}
test();
