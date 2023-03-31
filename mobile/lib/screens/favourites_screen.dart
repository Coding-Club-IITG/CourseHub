import 'package:coursehub/animations/fade_in_animation.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:flutter/material.dart';

import '../constants/themes.dart';
import '../database/hive_store.dart';
import '../widgets/common/custom_linear_progress.dart';
import '../widgets/favourite_screen/favourite_card.dart';

class FavouritesScreen extends StatefulWidget {
  const FavouritesScreen({super.key});

  @override
  State<FavouritesScreen> createState() => _FavouritesScreenState();
}

class _FavouritesScreenState extends State<FavouritesScreen> {
  var _isLoading = false;
  late final List<Favourite> favourites;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomFadeInAnimation(
        child: favourites.isEmpty
            ? const EmptyList()
            : Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        vertical: 20, horizontal: 30),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "FAVOURITES",
                          style: Themes.darkTextTheme.displayLarge,
                        ),
                        const SizedBox(
                          height: 10.0,
                        ),
                        Expanded(
                          child: GridView.builder(
                            physics: const ScrollPhysics(
                                parent: BouncingScrollPhysics()),
                            itemCount: favourites.length,
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10.0,
                                    mainAxisSpacing: 2.0,
                                    childAspectRatio: 1.2),
                            itemBuilder: (context, index) {
                              String myPath =
                                  "${favourites[index].path.split("/")[1]} > ${favourites[index].path.split("/")[2]}";
                              return FavouriteCard(
                                setLoadingCallback: setloading,
                                id: favourites[index].favouriteId,
                                index: favourites[index].code.toUpperCase(),
                                address: myPath,
                                name: favourites[index].name.length >= 30
                                    ? "${favourites[index].name.substring(0, 30)} ...${favourites[index].name.substring(favourites[index].name.length - 4, favourites[index].name.length)}"
                                    : favourites[index].name,
                              );
                            },
                          ),
                        ),
                        Visibility(
                          visible: favourites.length <= 4,
                          child: Center(
                            child: Image.asset(
                              'assets/favourites.png',
                              height: 280,
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  Visibility(
                      visible: _isLoading,
                      child: const CustomLinearProgress(
                        text: 'Generating Preview Link',
                      ))
                ],
              ),
      ),
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
