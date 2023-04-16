import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:file_picker/file_picker.dart';
// ignore: depend_on_referenced_packages
import 'package:path/path.dart';
import 'dart:io';
import 'package:dotted_border/dotted_border.dart';

import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class Upload extends StatefulWidget {
  final Function(File? file) callback;
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
          FilePickerResult? result = await FilePicker.platform.pickFiles();

          if (result != null) {
            File file = File(result.files.single.path ?? '');
            widget.callback(file);
            int length = basename(file.path).length;
            String name = basename(file.path);

            if (length >= 20) {
              name =
                  '${basename(file.path).substring(0, 15)} ... ${basename(file.path).substring(length - 4, length)}';
            }

            setState(() {
              center = Row(
                mainAxisAlignment: MainAxisAlignment.center,
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
              );
            });
          } else {
            widget.callback(null);
          }
        } catch (e) {
          showSnackBar('Something went wrong !', context);
        }
      },
      child: DottedBorder(
        strokeWidth: 1,
        color: widget.color,
        dashPattern: const [6],
        child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 30), child: center),
      ),
    );
  }
}
