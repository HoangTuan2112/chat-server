const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const UserError = require('../exception/UserError');
const BucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const { v4: uuidv4 } = require('uuid');

const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey,
});

const FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE);

class AwsS3Service {
    async uploadFile(file, bucketName = BucketName) {
        const fileStream = fs.readFileSync(file.path);

        const uploadParams = {
            Bucket: bucketName,
            Body: fileStream,
            Key: `${uuidv4()}-${Date.now()}-${file.originalname}`,
        };

        const { mimetype } = file;
        if (
            mimetype === 'image/jpeg' ||
            mimetype === 'image/png' ||
            mimetype === 'image/gif' ||
            mimetype === 'video/mp3' ||
            mimetype === 'video/mp4'
        )
            uploadParams.ContentType = mimetype;

        try {
            const { Location } = await s3.upload(uploadParams).promise();

            return Location;
        } catch (err) {
            console.log('err: ', err);
            throw new UserError('Upload file Aws S3 failed');
        }
    }

    async uploadFiles(files, bucketName = BucketName) {
        let groupLocation = '';

        for (let file of files) {
            groupLocation += (await this.uploadFile(file, bucketName)) + ';';
        }
        console.log('groupLocation ', groupLocation);
        return groupLocation;
    }

    async uploadWithBase64(fileBase64, fileName, fileExtension) {
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        if (fileBuffer.length > FILE_SIZE) throw new UserError('Size file < 20 MB');

        const uploadParams = {
            Bucket: BucketName,
            Body: fileBuffer,
            Key: `${uuidv4()}-${Date.now()}-${fileName}${fileExtension}`,
        };

        if (fileExtension === '.png') uploadParams.ContentType = 'image/png';
        if (fileExtension === '.jpg' || fileExtension === '.jpeg') uploadParams.ContentType = 'image/jpeg';
        if (fileExtension === '.mp3') uploadParams.ContentType = 'video/mp3';
        if (fileExtension === '.mp4') uploadParams.ContentType = 'video/mp4';

        try {
            const { Location } = await s3.upload(uploadParams).promise();

            return Location;
        } catch {
            throw new UserError('Upload file Aws S3 failed');
        }
    }

    async deleteFile(url, bucketName = BucketName) {
        const urlSplit = url.split('/');
        const key = urlSplit[urlSplit.length - 1];

        const params = {
            Bucket: bucketName,
            Key: key,
        };

        try {
            await s3.deleteObject(params).promise();
        } catch (err) {
            throw new UserError('Delete file Aws S3 failed');
        }
    }
}

module.exports = new AwsS3Service();
