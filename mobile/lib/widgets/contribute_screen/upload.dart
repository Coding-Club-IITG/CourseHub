import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart';
import 'dart:io';
import 'package:dotted_border/dotted_border.dart';

import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class Upload extends StatefulWidget {
  final Function(List<File> files) callback;
  final Color color;
  const Upload({super.key, required this.callback, required this.color});

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
          FilePickerResult? result =
              await FilePicker.platform.pickFiles(allowMultiple: true);

          if (result != null) {
            List<File> files =
                result.paths.map((path) => File(path ?? '')).toList();
            widget.callback(files);

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

                  return Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Row(
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
                            name,
                            style: Themes.darkTextTheme.bodyLarge,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            });
          } else {
            widget.callback([]);
          }
        } catch (e) {
          showSnackBar('Something went wrong !', context);
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
