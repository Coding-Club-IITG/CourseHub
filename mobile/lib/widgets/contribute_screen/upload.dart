import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart';
import 'dart:io';
import 'package:dotted_border/dotted_border.dart';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/themes.dart';

class Upload extends StatefulWidget {
  final Color color;

  const Upload({
    super.key,
    required this.color,
  });

  @override
  State<Upload> createState() => _UploadState();
}

class _UploadState extends State<Upload> {
  Widget center = Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      const Icon(Icons.upload),
      const SizedBox(
        width: 10,
      ),
      Text(
        'UPLOAD FILES',
        style: Themes.darkTextTheme.bodyLarge,
      ),
    ],
  );
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        try {
          if (context.read<NavigationProvider>().currentPageNumber == 8) {
            final ImagePicker imagePicker = ImagePicker();
            List<XFile>? imageFileList = [];

            final List<XFile> selectedImages =
                await imagePicker.pickMultiImage();
            if (selectedImages.isNotEmpty) {
              imageFileList.addAll(selectedImages);
            }
            if (!mounted) return;

            List<File> imageFiles =
                selectedImages.map((e) => File(e.path)).toList();

            context.read<NavigationProvider>().addFiles(imageFiles);
          } else {
            FilePickerResult? result = await FilePicker.platform.pickFiles(
              allowMultiple: true,
            );

            if (result != null) {
              List<File> filesAdded =
                  result.paths.map((path) => File(path ?? '')).toList();
              if (!mounted) return;
              context.read<NavigationProvider>().addFiles(filesAdded);
            }
          }
          if (!mounted) return;
          final files = context.read<NavigationProvider>().selectedFiles;

          setState(() {
            center = ListView.builder(
              itemCount: files.length,
              itemBuilder: (context, index) {
                File file = files[index];
                int length = basename(file.path).length;
                String name = basename(file.path);

                if (length >= 20) {
                  name =
                      '${basename(file.path).substring(0, 15)} ... ${basename(file.path).substring(length - 4, length)}';
                }

                return Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Colors.green,
                    ),
                    const SizedBox(
                      width: 10,
                    ),
                    SizedBox(
                      child: Text(
                        context.read<NavigationProvider>().currentPageNumber !=
                                8
                            ? name
                            : 'CH_Feedback ${name.split('image_picker')[1]}',
                        style: Themes.darkTextTheme.bodyLarge,
                      ),
                    ),
                  ],
                );
              },
            );
          });
        } catch (e) {
          showSnackBar('Something went wrong!', context);
        }
      },
      child: DottedBorder(
        strokeWidth: 1,
        color: widget.color,
        dashPattern: const [6],
        child: Center(
          child: SizedBox(
            height: 80,
            child: center,
          ),
        ),
      ),
    );
  }
}
