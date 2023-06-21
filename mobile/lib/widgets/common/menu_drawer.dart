import 'package:coursehub/apis/authentication/login.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:provider/provider.dart';

import '../../constants/themes.dart';
import '../../providers/navigation_provider.dart';

class MenuDrawer extends StatelessWidget {
  const MenuDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return Drawer(
      width: 250,
      backgroundColor: Colors.black,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(
            height: 200,
            child: DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.black,
              ),
              child: Text(
                'CourseHub',
                style: TextStyle(fontSize: 32),
              ),
            ),
          ),
          MenuItems(
              icon: const Icon(
                Icons.library_books_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();

                  showSnackBar('Login with outlook to use this feature!', context);
                  return;
                }

                navigationProvider.changePageNumber(6);
                Navigator.of(context).pop();
              },
              title: 'Exam Schedule'),
          MenuItems(
              icon: const Icon(
                Icons.downloading_sharp,
                color: Colors.white,
              ),
              onPressed: () {
                showSnackBar('This feature coming soon!', context);
                Navigator.of(context).pop();
              },
              title: 'Downloads'),
          MenuItems(
              icon: const Icon(
                Icons.handshake_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                showSnackBar('This feature coming soon!', context);
                Navigator.of(context).pop();
              },
              title: 'Special Thanks'),
          MenuItems(
              icon: const Icon(
                Icons.feedback_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                if (CacheStore.isGuest) {
                  Navigator.of(context).pop();
                  showSnackBar('Login with outlook to use this feature!', context);
                  return;
                }
                navigationProvider.changePageNumber(8);
                Navigator.of(context).pop();
              },
              title: 'Feedback/ Bugs'),
          MenuItems(
              icon: const Icon(
                Icons.people_alt_outlined,
                color: Colors.white,
              ),
              onPressed: () {
                navigationProvider.changePageNumber(7);

                Navigator.of(context).pop();
              },
              title: 'Team'),
          const Spacer(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              'Designed, Developed &\nMaintained by',
              style: TextStyle(fontWeight: FontWeight.w400),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            child: Row(
              children: [
                SvgPicture.asset('assets/cc_logo.svg'),
                const SizedBox(
                  width: 10,
                ),
               const  Column(
                  children:  [
                    Text(
                      'Coding Club',
                      style: TextStyle(
                        fontFamily: 'Raleway',
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(
                      height: 2,
                    ),
                    Text(
                      'IIT Guwahati',
                      style: TextStyle(
                          fontWeight: FontWeight.w500, fontFamily: 'Raleway'),
                    )
                  ],
                )
              ],
            ),
          ),
          Material(
            color: Colors.red,
            child: InkWell(
              splashColor: Colors.redAccent,
              onTap: () {
                showDialog(
                  context: context,
                  builder: (context) => Dialog(
                    elevation: 50,
                    insetPadding: const EdgeInsets.symmetric(horizontal: 5),
                    backgroundColor: Colors.transparent,
                    child: GestureDetector(
                      onTap: () {},
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(
                            color: Themes.kYellow,
                            width: 2,
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(
                            vertical: 15, horizontal: 16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Are you sure \nyou want to logout ?',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 21,
                                  color: Colors.black,
                                  fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(
                              height: 20,
                            ),
                            SizedBox(
                              width: 280,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                // mainAxisSize: MainAxisSize.min,
                                children: [
                                  TextButton(
                                    style: ButtonStyle(
                                      overlayColor:
                                          MaterialStateColor.resolveWith(
                                              (states) => const Color.fromRGBO(
                                                  254, 207, 111, 0.3)),
                                    ),
                                    onPressed: () async {
                                      await logoutHandler(context);
                                    },
                                    child: const Text(
                                      'Logout',
                                      style: TextStyle(
                                          color: Colors.black,
                                          fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                  const SizedBox(
                                    width: 10,
                                  ),
                                  Material(
                                    color: Themes.kYellow,
                                    child: InkWell(
                                      splashColor:
                                          const Color.fromRGBO(0, 0, 0, 0.1),
                                      onTap: () {
                                        Navigator.of(context).pop();
                                      },
                                      child: SizedBox(
                                        height: 35,
                                        width: 75,
                                        child: Center(
                                          child: Text(
                                            'Cancel',
                                            style:
                                                Themes.darkTextTheme.bodyLarge,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
              child: Container(
                height: 70,
                padding:
                    const EdgeInsets.symmetric(horizontal: 30, vertical: 10),
                child: const Row(
                  children:  [
                    Icon(
                      Icons.arrow_circle_right_outlined,
                      color: Colors.white,
                      size: 32,
                    ),
                    SizedBox(
                      width: 10,
                    ),
                    Text(
                      'Logout',
                      style: TextStyle(fontSize: 18),
                    )
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}

class MenuItems extends StatelessWidget {
  final Function onPressed;
  final String title;
  final Icon icon;
  const MenuItems({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      splashColor: Colors.transparent,
      title: Row(
        children: [
          icon,
          const SizedBox(
            width: 15,
          ),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w400),
          ),
        ],
      ),
      onTap: () {
        onPressed();
      },
    );
  }
}
