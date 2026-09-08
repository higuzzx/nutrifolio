import { Platform, Share } from 'react-native';
export async function exportText(filename: string, text: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    await Share.share({ title: filename, message: text });
  }
}
