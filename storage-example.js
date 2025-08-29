
import { uploadFile, downloadFile } from '0g-kit';

const result = await uploadFile('./testvvt.txt');
console.log('\nUpload successful!\n', result);

// await downloadFile(result.rootHash, './downloaded-test.txt');
// console.log('Download completed!');
