import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/constants/all_courses.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/utilities/letter_capitalizer.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/themes.dart';
import '../database/hive_store.dart';
import '../widgets/common/custom_linear_progress.dart';
import '../widgets/favourite_screen/favourite_tile.dart';

class FavouritesScreen extends StatefulWidget {
  const FavouritesScreen({
    super.key,
  });

  @override
  State<FavouritesScreen> createState() => _FavouritesScreenState();
}

class _FavouritesScreenState extends State<FavouritesScreen> {
  var _isLoading = false;
  late final List<Favourite> favourites;
  bool _groupByCourses = false;

  void setloading() {
    setState(() {
      _isLoading = !_isLoading;
    });
  }

  @override
  void initState() {
    favourites = HiveStore.getFavourites();
    super.initState();
  }

  Future<bool> _isCourseGrouped() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool('courseGrouped') ?? false;
    } catch (e) {
      showSnackBar('Something Went Wrong!', context);
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    final navigatorProvider = context.read<NavigationProvider>();
    return WillPopScope(
      onWillPop: () async {
        navigatorProvider.changePageNumber(0);
        return false;
      },
      child: FutureBuilder<bool>(
          future: _isCourseGrouped(),
          builder: (context, snapshot) {
            _groupByCourses = snapshot.data ?? false;
            return Column(
              children: [
                const NavBar(),
                const SizedBox(
                  height: 10,
                ),
                Row(
                  children: [
                    const SizedBox(
                      width: 15,
                    ),
                    Checkbox(
                      value: _groupByCourses,
                      fillColor: MaterialStateProperty.all(Colors.transparent),
                      side: MaterialStateBorderSide.resolveWith(
                        (states) =>
                            const BorderSide(width: 2.0, color: Colors.black),
                      ),
                      checkColor: Colors.black,
                      onChanged: (value) async {
                        final prefs = await SharedPreferences.getInstance();

                        prefs.setBool('courseGrouped', value ?? false);
                        setState(
                          () {
                            _groupByCourses = !_groupByCourses;
                          },
                        );
                      },
                    ),
                    const Text(
                      'Group By Course',
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.black),
                    )
                  ],
                ),

                Expanded(
                  child: CustomFadeInAnimation(
                    child: favourites.isEmpty
                        ? const EmptyList()
                        : Stack(
                            children: [
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(
                                      height: 10.0,
                                    ),
                                    _groupByCourses
                                        ? GroupedCourses(
                                            setLoadingCallback: setloading,
                                          )
                                        : Expanded(
                                            child: AnimationLimiter(
                                              child: ListView.builder(
                                                  itemCount: favourites.length,
                                                  itemBuilder:
                                                      (BuildContext context,
                                                          int index) {
                                                    return AnimationConfiguration
                                                        .staggeredList(
                                                      position: index,
                                                      duration: const Duration(
                                                          milliseconds: 375),
                                                      child: SlideAnimation(
                                                        verticalOffset: 50.0,
                                                        child: FadeInAnimation(
                                                          child: FavouriteTile(
                                                            setLoadingCallback:
                                                                setloading,
                                                            favourite:
                                                                favourites[
                                                                    index],
                                                          ),
                                                        ),
                                                      ),
                                                    );
                                                  }),
                                            ),
                                          ),
                                  ],
                                ),
                              ),
                              Visibility(
                                visible: _isLoading,
                                child: const CustomLinearProgress(
                                  text: 'Generating Preview Link',
                                ),
                              )
                            ],
                          ),
                  ),
                ),
                // const Spacer(),
                Visibility(
                  visible: (favourites.isNotEmpty) &&
                          (favourites.length <= 4 && _groupByCourses) ||
                      (!_groupByCourses &&
                          favourites.length <= 6 &&
                          (favourites.isNotEmpty)),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 15),
                    child: Image.asset(
                      'assets/favourites.png',
                      height: 280,
                    ),
                  ),
                ),
              ],
            );
          }),
    );
  }
}

class EmptyList extends StatelessWidget {
  const EmptyList({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Nothing Here!',
            style: Themes.darkTextTheme.displayLarge,
          ),
          const SizedBox(
            height: 15,
          ),
          const Text(
            'Click on the "star" icon next to any\n file to add files to your favourites',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w400,
              color: Color.fromRGBO(108, 108, 108, 1),
              fontSize: 14.0,
            ),
          ),
          const SizedBox(
            height: 20,
          ),
          Image.asset(
            'assets/my_profile_no_contri.png',
            width: 300,
          ),
        ],
      ),
    );
  }
}

class GroupedCourses extends StatelessWidget {
  final Function setLoadingCallback;

  const GroupedCourses({super.key, required this.setLoadingCallback});

  @override
  Widget build(BuildContext context) {
    final List<Favourite> favourites = HiveStore.getFavourites();

    Map<String, List<Favourite>> groupedFavourites = {};

    for (var fav in favourites) {
      if (groupedFavourites[fav.code.toLowerCase()] != null) {
        groupedFavourites[fav.code.toLowerCase()]!.add(fav);
      } else {
        groupedFavourites[fav.code.toLowerCase()] = [fav];
      }
    }

    return Expanded(
      child: AnimationLimiter(
        child: ListView.builder(
            itemCount: groupedFavourites.length,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, index) {
              String key = groupedFavourites.keys.elementAt(index);

              final course =
                  courses.firstWhere((course) => course['code'] == key);

              List<Widget> children = [];

              children.add(
                Row(
                  children: [
                    const SizedBox(
                      width: 15,
                    ),
                    Text(
                      '${key.toUpperCase()}: ${letterCapitalizer(course['name'] ?? ' ')}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.black),
                    ),
                  ],
                ),
              );

              for (var fav in groupedFavourites[key]!) {
                {
                  children.add(FavouriteTile(
                      favourite: fav, setLoadingCallback: setLoadingCallback));
                }
              }

              children.add(const SizedBox(
                height: 20,
              ));

              return AnimationConfiguration.staggeredList(
                position: index,
                duration: const Duration(milliseconds: 375),
                child: SlideAnimation(
                  verticalOffset: 50.0,
                  child: FadeInAnimation(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: children,
                    ),
                  ),
                ),
              );
            }),
      ),
    );
  }
}
