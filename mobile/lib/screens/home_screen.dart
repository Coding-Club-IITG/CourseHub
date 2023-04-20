import 'package:coursehub/animations/fade_in_animation.dart';

import 'package:coursehub/models/user.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/home_screen/add_course_dialog.dart';
import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import '../constants/themes.dart';
import '../database/hive_store.dart';
import '../widgets/home_screen/course_card.dart';

class HomeScreen extends StatefulWidget {
  final Function(int a) returnToPageCallback;

  const HomeScreen({
    super.key,
    required this.returnToPageCallback,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final User user;

  @override
  void initState() {
    user = HiveStore.getUserDetails();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: CustomFadeInAnimation(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 0.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NavBar(searchCallback: widget.returnToPageCallback),
              Row(
                children: [
                  const SizedBox(
                    width: 26.0,
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Welcome,",
                          style: Themes.theme.textTheme.displaySmall,
                        ),
                        Text(
                          user.name,
                          style: Themes.theme.textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                  Image.asset(
                    "assets/home_books.png",
                    width: 140,
                  ),
                ],
              ),
              const SizedBox(
                height: 26.0,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 26.0),
                child: Text("MY COURSES",
                    style: Themes.theme.textTheme.bodyMedium),
              ),
              Expanded(
                  child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 26.0, vertical: 19.0),
                child: AnimationLimiter(
                  child: GridView.count(
                    physics:const BouncingScrollPhysics(),
                    shrinkWrap: true,
                    crossAxisCount: 2,
                    crossAxisSpacing: 23.0,
                    mainAxisSpacing: 16.0,
                    childAspectRatio: 1.25,
                    children: List.generate(
                      user.courses.length + 1,
                      (int index) {
                       
                        return AnimationConfiguration.staggeredGrid(
                          columnCount: 2,
                          position: index,
                          duration: const Duration(milliseconds: 375),
                          child: ScaleAnimation(
                            scale: 0.5,
                            child: FadeInAnimation(
                              child: index < user.courses.length
                                  ? CourseCard(
                                      course: user.courses[index],
                                      returnToPageCallback:
                                          widget.returnToPageCallback,
                                    )
                                  : Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: () {
                                          showDialog(
                                            context: context,
                                            barrierColor: const Color.fromRGBO(
                                                0, 0, 0, 0.8),
                                            builder: (context) =>
                                                const AddCourseDialog(),
                                          );
                                        },
                                        splashColor: Colors.white10,
                                        child: Container(
                                          margin: const EdgeInsets.all(
                                              0.6), // otherwise dotted border seems faded on some side on iphone
                                          child: DottedBorder(
                                            strokeWidth: 1,
                                            color: Colors.white,
                                            dashPattern: const [6],
                                            child: Center(
                                              child: Column(
                                                mainAxisSize: MainAxisSize.min,
                                                children: const [
                                                  Icon(
                                                    Icons.add,
                                                    color: Colors.white,
                                                    size: 36,
                                                  ),
                                                  Text(
                                                    'Add Course',
                                                    style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w400),
                                                  )
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }
}
