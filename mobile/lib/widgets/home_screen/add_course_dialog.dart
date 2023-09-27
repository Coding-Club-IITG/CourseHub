import 'package:coursehub/apis/courses/add_courses.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/screens/splash_screen.dart';
import 'package:coursehub/widgets/common/custom_linear_progress.dart';
import 'package:coursehub/widgets/nav_bar/search_card.dart';
import 'package:flutter/material.dart';

import '../../apis/courses/search_course.dart';
import '../../models/search_result.dart';
import '../common/custom_snackbar.dart';

class AddCourseDialog extends StatefulWidget {
  const AddCourseDialog({super.key});

  @override
  State<AddCourseDialog> createState() => _AddCourseDialogState();
}

class _AddCourseDialogState extends State<AddCourseDialog> {
  bool _isEnabled = false;
  bool _isSearched = false;
  bool _isLoading = false;

  final _courseController = TextEditingController();
  final _courseNode = FocusNode();

  List<SearchResult> searchResult = [];
  bool? _found;

  Future<void> search(value) async {
    try {
      final res = await searchCourse(value.toString().trim());

      setState(() {
        _found = res['found'];
      });

      List<dynamic> results = res['results'];

      setState(() {
        if (_found ?? false) {
          searchResult = results.map((e) => SearchResult.fromJson(e)).toList();
        }
      });

      setState(() {
        _isSearched = true;
      });
    } catch (e) {
      showSnackBar('Something went wrong!', context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Dialog(
          elevation: 50,
          insetPadding: const EdgeInsets.symmetric(horizontal: 5),
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
                        child: TextField(
                          textInputAction: TextInputAction.search,
                          onSubmitted: (value) async {
                            try {
                              await search(value);
                            } catch (e) {
                              showSnackBar('Something went wrong!', context);
                            }
                          },
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
                            contentPadding: EdgeInsets.symmetric(
                                vertical: 0, horizontal: 10),
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
                    height: 15,
                  ),
                  Visibility(
                    visible: _isSearched,
                    child: _found ?? false
                        ? SizedBox(
                            height: 150,
                            child: ListView.builder(
                              itemCount: searchResult.length,
                              itemBuilder: (context, index) => SearchCard(
                                isAvailable: searchResult[index].isAvailable,
                                courseCode: searchResult[index].code,
                                courseName: searchResult[index].name,
                                isTempCourse: false,
                                callback: () async {
                                  try {
                                    final user = HiveStore.getUserDetails();

                                    bool isPresent = user.courses.any(
                                        (element) =>
                                            element?.code ==
                                            searchResult[index].code);

                                    if (isPresent) {
                                      Navigator.of(context).pop();
                                      showSnackBar(
                                          'Course Already Added!', context);
                                      return;
                                    }

                                    setState(() {
                                      _isLoading = true;
                                    });

                                    await addUserCourses(
                                        searchResult[index].code,
                                        searchResult[index].name);

                                    setState(() {
                                      _isLoading = false;
                                    });

                                    if (!mounted) return;
                                    Navigator.of(context).pushAndRemoveUntil(
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              const SplashScreen(),
                                        ),
                                        (route) => false);
                                    showSnackBar(
                                        "Course Succesfully added", context);
                                  } catch (e) {
                                    showSnackBar(
                                        "Something Went Wrong!", context);
                                  }
                                },
                              ),
                            ),
                          )
                        : Center(
                            child: Text(
                              'No results found!',
                              style: Themes.darkTextTheme.displaySmall,
                            ),
                          ),
                  ),
                  const SizedBox(
                    height: 15,
                  ),
                  Material(
                    color: _isEnabled ? Themes.kYellow : Colors.grey,
                    child: InkWell(
                      splashColor: const Color.fromRGBO(0, 0, 0, 0.1),
                      onTap:!_isEnabled
                          ? null
                          : () async {
                              try {
                                await search(_courseController.text);
                              } catch (e) {
                                showSnackBar('Something went wrong!', context);
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
          ),
        ),
        Visibility(
            visible: _isLoading,
            child: const CustomLinearProgress(
              text: 'Adding Course ...',
            ))
      ],
    );
  }
}
