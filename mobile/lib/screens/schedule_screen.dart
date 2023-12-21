import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/schedule_screen/day_container.dart';
import 'package:coursehub/widgets/schedule_screen/day_section.dart';
import 'package:coursehub/widgets/schedule_screen/page_change_button.dart';
import 'package:coursehub/widgets/schedule_screen/custom_timeline_tile.dart';
import 'package:flutter/material.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<StatefulWidget> createState() => _ScheduleScreen();
}

class _ScheduleScreen extends State<ScheduleScreen> {
  final List<String> days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  int activeDayIndex = 0;
  bool activeMenu = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: SafeArea(
      child: Ink(
        color: Colors.black,
        child: Column(
          children: [
            const NavBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 4),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Schedule',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color.fromRGBO(255, 255, 255, 1),
                          fontSize: 26,
                        ),
                      ),
                      Row(
                        children: [
                          PageChangeButton(
                              callBack: () {
                                setState(() {
                                  activeMenu = false;
                                });
                              },
                              isActive: !activeMenu,
                              logoImage: "assets/schedule_logo.svg"),
                          const SizedBox(
                            width: 6,
                          ),
                          PageChangeButton(
                            callBack: () {
                              setState(() {
                                activeMenu = true;
                              });
                            },
                            isActive: activeMenu,
                            logoImage: "assets/menu_logo.svg",
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  Container(
                    height: 60,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: ListView.separated(
                      separatorBuilder: (context, index) => const SizedBox(
                        width: 20,
                      ),
                      scrollDirection: Axis.horizontal,
                      itemCount: days.length,
                      itemBuilder: (context, index) => DayContainer(
                        currentDay: days[index],
                        isActive: index == activeDayIndex,
                        callback: () {
                          setState(() {
                            activeDayIndex = index;
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(
                    height: 12,
                  ),
                ],
              ),
            ),
            const DaySection(
              section: 'Forenoon',
              numClasses: 4,
            ),
            Container(
              height: 250,
              padding: const EdgeInsets.fromLTRB(24, 24, 0, 24),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: 4, 
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return const CustomTimeLineTile(
                      isFirst: true,
                      isLast: false,
                      isUpcoming: false,
                    );
                  } else if (index == 3) {
                    return const CustomTimeLineTile(
                      isFirst: false,
                      isLast: true,
                      isUpcoming: true,
                    );
                  } else {
                    return const CustomTimeLineTile(
                      isFirst: false,
                      isLast: false,
                      isUpcoming: true,
                    );
                  }
                },
              ),
            ),
            const DaySection(
              section: 'Afternoon',
              numClasses: 2,
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(24, 24, 0, 24),
              height: 250,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: 4,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return const CustomTimeLineTile(
                      isFirst: true,
                      isLast: false,
                      isUpcoming: false,
                    );
                  } else if (index == 3) {
                    return const CustomTimeLineTile(
                      isFirst: false,
                      isLast: true,
                      isUpcoming: true,
                    );
                  } else {
                    return const CustomTimeLineTile(
                      isFirst: false,
                      isLast: false,
                      isUpcoming: true,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    ));
  }
}
