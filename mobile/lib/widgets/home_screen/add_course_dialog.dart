import 'package:coursehub/apis/courses/add_courses.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/controllers/set_hive_store.dart';
import 'package:flutter/material.dart';

class AddCourseDialog extends StatefulWidget {
  const AddCourseDialog({super.key});

  @override
  State<AddCourseDialog> createState() => _AddCourseDialogState();
}

class _AddCourseDialogState extends State<AddCourseDialog> {
  bool _isEnabled = false;
  final _courseController = TextEditingController();
  final _courseNode = FocusNode();

  @override
  Widget build(BuildContext context) {
    return Dialog(
        elevation: 50,
        backgroundColor: Colors.transparent,
        child: GestureDetector(
          onTap: () {
            _courseNode.unfocus();
          },
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Add new course',
                  style: Themes.darkTextTheme.displayLarge,
                ),
                const SizedBox(
                  height: 20,
                ),
                Row(
                  children: [
                    Text(
                      'COURSE CODE: ',
                      style: Themes.darkTextTheme.bodyLarge,
                    ),
                    const SizedBox(
                      width: 20,
                    ),
                    Expanded(
                      child: TextFormField(
                        controller: _courseController,
                        focusNode: _courseNode,
                        onChanged: (value) {
                          setState(
                            () {
                              value.isEmpty
                                  ? _isEnabled = false
                                  : _isEnabled = true;
                            },
                          );
                        },
                        cursorColor: Colors.grey[600],
                        keyboardType: TextInputType.name,
                        decoration: const InputDecoration(
                          hintText: 'Course Code / Name',
                          contentPadding:
                              EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.grey),
                            borderRadius: BorderRadius.all(
                              Radius.circular(0),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(0),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(
                  height: 30,
                ),
                Material(
                  color: _isEnabled ? Themes.kYellow : Colors.grey,
                  child: InkWell(
                    splashColor: const Color.fromRGBO(0, 0, 0, 0.1),
                    onTap: !_isEnabled
                        ? null
                        : () async {
                            try {
                              await addUserCourses('', '');
                            } catch (e) {
                              print(e);
                            }
                          },
                    child: SizedBox(
                      height: 50,
                      child: Center(
                        child: Text(
                          'SEARCH CODE',
                          style: Themes.darkTextTheme.bodyLarge,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ));
  }
}
