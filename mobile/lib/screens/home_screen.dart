import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/database/cache_store.dart';

import 'package:coursehub/models/user.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/home_screen/add_course_dialog.dart';
import 'package:coursehub/widgets/home_screen/exam_dialog.dart';
import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

import '../constants/themes.dart';
import '../database/hive_store.dart';

import '../widgets/home_screen/course_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
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
    return Ink(
      color: Colors.black,
      child: CustomFadeInAnimation(
        child: Stack(
          children: [
            const NavBar(),
            Padding(
              padding: const EdgeInsets.only(top: 80),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const SizedBox(
                          width: 26.0,
                        ),
                        Column(
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
                        const Spacer(),
                        Image.asset(
                          "assets/home_books.png",
                          width: 140,
                        ),
                      ],
                    ),
               
                   const Padding(
                      padding:  EdgeInsets.symmetric(horizontal: 30,vertical: 20),
                      child:  ExamDialog(),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 26.0),
                      child: Text("MY COURSES",
                          style: Themes.theme.textTheme.bodyMedium),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 26.0, vertical: 19.0),
                      child: AnimationLimiter(
                        child: GridView.count(
                          physics: const NeverScrollableScrollPhysics(),
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
                                          )
                                        : CacheStore.isGuest
                                            ? Container()
                                            : Material(
                                                color: Colors.transparent,
                                                child: InkWell(
                                                  onTap: () {
                                                    showDialog(
                                                      context: context,
                                                      barrierColor:
                                                          const Color.fromRGBO(
                                                              0, 0, 0, 0.8),
                                                      builder: (context) =>
                                                          const AddCourseDialog(),
                                                    );
                                                  },
                                                  splashColor: Colors.white10,
                                                  child: Container(
                                                    margin: const EdgeInsets
                                                            .all(
                                                        0.6), // otherwise dotted border seems faded on some side on iphone
                                                    child: DottedBorder(
                                                      strokeWidth: 1,
                                                      color: Colors.white,
                                                      dashPattern: const [6],
                                                      child: Center(
                                                        child: Column(
                                                          mainAxisSize:
                                                              MainAxisSize.min,
                                                          children: const [
                                                            Icon(
                                                              Icons.add,
                                                              color:
                                                                  Colors.white,
                                                              size: 36,
                                                            ),
                                                            Text(
                                                              'Add Course',
                                                              style: TextStyle(
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w400),
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
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
