import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../utilities/animations/custom_fade_in_animation.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/nav_bar.dart';
import '../../apis/contributions/contribution.dart';
import '../constants/themes.dart';
import '../constants/years_sections.dart';
import '../../widgets/common/custom_linear_progress.dart';
import '../../widgets/common/custom_snackbar.dart';
import '../../widgets/contribute_screen/custom_textformfield.dart';
import '../../widgets/contribute_screen/dropdown_row.dart';
import '../providers/navigation_provider.dart';
import '../../widgets/contribute_screen/upload.dart';


class ContributeScreen extends StatefulWidget {
  final AnimationController controller;
  const ContributeScreen({super.key, required this.controller});

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

  void _onCourseChange(dynamic a) {
    _course = a;
  }

  void _onSectionChange(dynamic a) {
    _section = sections[a];
  }

  void _onYearChange(dynamic a) {
    _year = year[a];
  }

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          Column(
            children: [
              const NavBar(),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      CustomFadeInAnimation(
                        child: Padding(
                          padding: const EdgeInsets.only(
                              top: 20, left: 30, right: 30),
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
                                  height: 20,
                                ),
                                Text(
                                  'DESCRIPTION',
                                  style: Themes.darkTextTheme.bodyLarge,
                                ),
                                const SizedBox(
                                  height: 15,
                                ),
                                CustomTextformfield(
                                  controller: _descriptionController,
                                ),
                                const SizedBox(
                                  height: 20,
                                ),
                                Upload(
                                  color: color,
                                ),
                                const SizedBox(
                                  height: 20,
                                ),
                                CustomButton(
                                    title: 'Submit',
                                    onPressed: () async {
                                      final files = context
                                          .read<NavigationProvider>()
                                          .selectedFiles;

                                      if (files.isEmpty) {
                                        setState(() {
                                          color = Colors.red;
                                        });
                                        return;
                                      }
                                      setState(() {
                                        color = Colors.black;
                                      });

                                      if (_key.currentState!.validate()) {
                                        if (files.isEmpty) {
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
                                                files,
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

                                            widget.controller
                                                .reverse(from: 0.75);

                                            navigationProvider
                                                .changePageNumber(4);
                                          } catch (e) {
                                       
                                            setState(() {
                                              _isLoading = false;
                                            });
                                            showSnackBar(
                                                'Something Went Wrong!',
                                                context);
                                          }
                                        }
                                      } else if (files.isEmpty) {
                                        setState(() {
                                          color = Colors.red;
                                        });
                                      }
                                    })
                              ],
                            ),
                          ),
                        ),
                      ),
                      SizedBox(
                        height: 180,
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
