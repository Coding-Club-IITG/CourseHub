import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:coursehub/widgets/schedule_screen/classes_section.dart';
import 'package:coursehub/widgets/schedule_screen/day_section.dart';
import 'package:coursehub/widgets/schedule_screen/no_class_banner.dart';
import 'package:coursehub/widgets/schedule_screen/page_change_button.dart';
import 'package:coursehub/widgets/schedule_screen/week_days_section.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<StatefulWidget> createState() => _ScheduleScreen();
}

class _ScheduleScreen extends State<ScheduleScreen> {
  bool activeMenu = true;

  @override
  Widget build(BuildContext context) {
    final navigatorProvider = context.read<NavigationProvider>();
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) {
        navigatorProvider.changePageNumber(0);
      },
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
                  const WeekDaysSection(),
                  const SizedBox(
                    height: 12,
                  ),
                ],
              ),
            ),
            const Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    DaySection(
                      section: 'Your Day',
                      numClasses: 4,
                    ),
                    ClassesSection(),
                  
                    NoClassBanner(),
                    SizedBox(
                      height: 40,
                    )
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

