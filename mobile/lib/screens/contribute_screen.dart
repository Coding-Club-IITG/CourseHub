
import 'dart:io';

import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:coursehub/apis/contributions/contribution.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/constants/years_sections.dart';
import 'package:coursehub/widgets/common/custom_linear_progress.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:coursehub/widgets/contribute_screen/custom_textformfield.dart';
import 'package:coursehub/widgets/contribute_screen/dropdown_row.dart';
import 'package:coursehub/widgets/contribute_screen/upload.dart';
import 'package:flutter_svg/flutter_svg.dart';

class ContributeScreen extends StatefulWidget {
  final Function(int a) callback;
  const ContributeScreen({super.key, required this.callback});

  @override
  State<ContributeScreen> createState() => _ContributeScreenState();
}

class _ContributeScreenState extends State<ContributeScreen> {
  final _key = GlobalKey<FormState>();

  final _descriptionController = TextEditingController();

  var _course = '';
  var _section = 'Lecture Slides';
  var _year = '2023';
  var color = Colors.black;
  var _isLoading = false;
  List<File> _files = [];

  void _onCourseChange(dynamic a) {
    _course = a;
  }

  void _onSectionChange(dynamic a) {
    _section = sections[a];
  }

  void _onYearChange(dynamic a) {
    _year = year[a];
  }

  void _onFileUpload(List<File> files) {

    if (files.isEmpty) {
      setState(() {
        color = Colors.red;
      });
    } else {
      setState(() {
        color = Colors.black;
      });
      _files = files;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          Column(
            children: [
              NavBar(searchCallback: (searchCallback) {}),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      CustomFadeInAnimation(
                        child: Padding(
                          padding: const EdgeInsets.only(
                              top: 10, left: 30, right: 30),
                          child: Form(
                            key: _key,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.start,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Contribute to CourseHub',
                                  style: Themes.darkTextTheme.displayLarge,
                                ),
                                const SizedBox(
                                  height: 20,
                                ),
                                DropdownRow(
                                  label: 'COURSE',
                                  callback: _onCourseChange,
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                DropdownRow(
                                  label: 'SECTION',
                                  callback: _onSectionChange,
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                DropdownRow(
                                  label: 'YEAR',
                                  callback: _onYearChange,
                                ),
                                const SizedBox(
                                  height: 15,
                                ),
                                Text(
                                  'DESCRIPTION',
                                  style: Themes.darkTextTheme.bodyLarge,
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                CustomTextformfield(
                                  controller: _descriptionController,
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                Upload(
                                  color: color,
                                  callback: _onFileUpload,
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                Material(
                                  color: Themes.kYellow,
                                  child: InkWell(
                                    splashColor:
                                        const Color.fromRGBO(0, 0, 0, 0.1),
                                    onTap: () async {
                                      if (_key.currentState!.validate()) {
                                        if (_files.isEmpty) {
                                          setState(() {
                                            color = Colors.red;
                                          });
                                          return;
                                        } else {
                                          try {
                                            setState(() {
                                              _isLoading = true;
                                            });
                                            await contributeData(
                                                _files,
                                                _year,
                                                _course,
                                                _section,
                                                _descriptionController.text);
                                            if (!mounted) return;
                                            setState(() {
                                              _isLoading = false;
                                            });
                                            showSnackBar(
                                                'You\'ve successfully contributed to CourseHub! 🎉',
                                                context);
                                            widget.callback(4);
                                          } catch (e) {
                                            setState(() {
                                              _isLoading = false;
                                            });
                                            showSnackBar(
                                                'Something Went Wrong !',
                                                context);
                                          }
                                        }
                                      } else if (_files.isEmpty) {
                                        setState(() {
                                          color = Colors.red;
                                        });
                                      }
                                    },
                                    child: Container(
                                      height: 45,
                                      decoration: BoxDecoration(
                                          color: Colors.transparent,
                                          border: Border.all(
                                              color: Colors.black, width: 0.5)),
                                      child: Center(
                                        child: Text(
                                          'SUBMIT',
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
                      SizedBox(
                        height: 200,
                        child: SvgPicture.asset(
                          'assets/contribute.svg',
                          width: double.infinity,
                        ),
                      )
                    ],
                  ),
                ),
              ),
            ],
          ),
          Visibility(
            visible: _isLoading,
            child: const CustomLinearProgress(
              text: 'Uploading Your Contributions',
            ),
          )
        ],
      ),
    );
  }
}
