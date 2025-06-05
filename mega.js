const mega = require("megajs");

// Your mega.nz account credentials
let email = 'mafiaadeel302@gmail.com'; // Your mega.nz account email
let password = 'mafiaadeel'; // Your mega.nz account password

const accountDetails = {
  email: email,
  password: password,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};

const upload = (fileStream, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      const storage = new mega.Storage(accountDetails, () => {
        const uploadOptions = {
          name: fileName,
          allowUploadBuffering: true
        };
        
        fileStream.pipe(storage.upload(uploadOptions));
        
        storage.on("add", file => {
          file.link((error, downloadLink) => {
            if (error) {
              throw error;
            }
            storage.close();
            resolve(downloadLink);
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  upload: upload
};