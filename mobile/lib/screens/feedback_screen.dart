import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/widgets/common/custom_button.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:coursehub/widgets/contribute_screen/upload.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class FeedBackScreen extends StatefulWidget {
  const FeedBackScreen({super.key});

  @override
  State<FeedBackScreen> createState() => _FeedBackScreenState();
}

class _FeedBackScreenState extends State<FeedBackScreen> {
  final _controller = TextEditingController();
  bool _isFeedback = true;

  @override
  Widget build(BuildContext context) {
    final navigatorProvider = context.read<NavigationProvider>();
    return WillPopScope(
      onWillPop: () async {
        navigatorProvider.changePageNumber(0);

        return false;
      },
      child: Column(
        children: [
          const NavBar(),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: SplashOnPressed(
                          splashColor: Colors.grey,
                          onPressed: () {
                            setState(() {
                              _isFeedback = true;
                            });
                          },
                          child: Ink(
                            height: 40,
                            decoration: BoxDecoration(
                              color: _isFeedback ? Colors.black : Colors.white,
                              border: Border.all(color: Colors.black),
                            ),
                            child: Center(
                              child: Text(
                                'Feedback',
                                style: TextStyle(
                                    color: _isFeedback
                                        ? Colors.white
                                        : Colors.black,
                                    fontWeight: !_isFeedback
                                        ? FontWeight.w400
                                        : FontWeight.w700),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: SplashOnPressed(
                          splashColor: Colors.grey,
                          onPressed: () {
                            setState(() {
                              _isFeedback = false;
                            });
                          },
                          child: Ink(
                            height: 40,
                            decoration: BoxDecoration(
                              color: !_isFeedback ? Colors.black : Colors.white,
                              border: Border.all(color: Colors.black),
                            ),
                            child: Center(
                              child: Text(
                                'Report Bug',
                                style: TextStyle(
                                    color: !_isFeedback
                                        ? Colors.white
                                        : Colors.black,
                                    fontWeight: _isFeedback
                                        ? FontWeight.w400
                                        : FontWeight.w700),
                              ),
                            ),
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  Text(
                    _isFeedback
                        ? 'Describe your Feedback'
                        : 'Describe the problem',
                    style: Themes.darkTextTheme.labelLarge,
                  ),
                  const SizedBox(
                    height: 10,
                  ),
                  TextField(
                    textInputAction: TextInputAction.next,
                    controller: _controller,
                    maxLines: 6,
                    keyboardType: TextInputType.text,
                    cursorColor: const Color.fromRGBO(140, 142, 151, 1),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.only(
                          top: 20, left: 20, right: 5, bottom: 5),
                      hintText:
                          _isFeedback ? 'Have something to say about CourseHub? This is the place to do it. \nYour feedback is crucial for making CourseHub the best it can be.':'Use this form to report any bugs/issues you\'ve encountered, and we\'ll do our best to address them as soon as possible.',
                      hintStyle: const TextStyle(
                        color: Color.fromRGBO(140, 142, 151, 1),
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      errorBorder:const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(0)),
                        borderSide: BorderSide(
                          color: Colors.red,
                          width: 1,
                        ),
                      ),
                      focusedErrorBorder: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(0)),
                        borderSide: BorderSide(
                          color: Colors.red,
                          width: 1,
                        ),
                      ),
                      focusedBorder: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(0)),
                        borderSide: BorderSide(
                          color: Color.fromRGBO(80, 80, 80, 1),
                          width: 1,
                        ),
                      ),
                      enabledBorder: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(0)),
                        borderSide: BorderSide(
                          color: Color.fromRGBO(160, 160, 160, 1),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  Text(
                    'Screenshots (Optional)',
                    style: Themes.darkTextTheme.labelLarge,
                  ),
                  const SizedBox(
                    height: 10,
                  ),
                  Expanded(
                    flex: 2,
                    child: Upload(
                      callback: (callback) {},
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  CustomButton(title: 'Submit', onPressed: () {}),
                  const Spacer(
                    flex: 3,
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
