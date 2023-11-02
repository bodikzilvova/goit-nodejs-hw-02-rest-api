const Jimp = require("jimp");

const resizeAndSaveAvatar = async function(originalPath, outputPath) {
  try {
    const image = await Jimp.read(originalPath);
    await image.resize(250, 250).writeAsync(outputPath);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  resizeAndSaveAvatar,
};